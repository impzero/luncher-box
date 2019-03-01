import { Affix, Layout } from 'antd';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import AdminMenuBar from './AdminMenuBar';

const { Content } = Layout;

interface Props {
  selectedKey: string;
  children?: ReactNode;
}

const StyledLayout = styled(Layout)`
  min-height: 100%;
  background: rgba(0, 0, 0, 0);
`;

const CustomHeader = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledContent = styled(Content)`
  padding: 50px;
  margin-bottom: 50px;
  height: auto;

  @media (max-width: 480px) {
    padding: 0;
  }
`;

const CustomFooter = styled.div`
  @media (min-width: 768px) {
    display: none;
  }
`;

const AdminLayout: React.FunctionComponent<Props> = props => {
  return (
    <StyledLayout>
      <CustomHeader>
        <Affix offsetTop={0}>
          <AdminMenuBar selectedKey={props.selectedKey} />
        </Affix>
      </CustomHeader>
      <StyledContent>{props.children}</StyledContent>
      <Affix offsetBottom={0}>
        <CustomFooter>
          <AdminMenuBar selectedKey={props.selectedKey} />
        </CustomFooter>
      </Affix>
    </StyledLayout>
  );
};

export default AdminLayout;
